import React, { Component, Fragment } from 'react';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import { DragDropContext } from "react-beautiful-dnd";
import { withStyles } from '@material-ui/core/styles';

import ScrambleList from '../../Scrambles/ScrambleList';
import { groupBy, flatMap } from '../../../logic/utils';
import { roundName } from '../../../logic/events';
import { formatById } from '../../../logic/formats';

const SpacedPaper = withStyles(theme => ({
  root: {
    marginBottom: theme.spacing(4),
  }
}))(Paper);


const attemptFromDroppable = elem => parseInt(elem.droppableId.split("-")[1]);

const ListForGenericRound = ({ round }) => (
  <Paper>
    <Typography variant="h4">
      Used for round
    </Typography>
    <ScrambleList scrambles={round.scrambleSets} holds="round" />
  </Paper>
);

const ListForAttemptBasedRound = ({ round }) => {
  const nAttempts = formatById(round.format).solveCount;
  let attempts = [...Array(nAttempts).keys()].map(i => ++i);
  return (
    <Fragment>
      {attempts.map(index => (
        <SpacedPaper key={index}>
          <Typography variant="h4">
            Used for attempt {index}
          </Typography>
          <ScrambleList
            scrambles={round.scrambleSets.filter(s => s.attemptNumber === index)}
            holds={`round-${index}`}
          />
        </SpacedPaper>
      ))}
    </Fragment>
  );
}


export default class RoundPanel extends Component {
  constructor(props) {
    super(props);
    this.state = {
      availableScrambles: this.props.availableScrambles,
    };
  }

  componentDidUpdate(prevProps) {
    let prevIds = this.state.availableScrambles.map(s => s.id).sort();
    let newIds = this.props.availableScrambles.map(s => s.id).sort();

    if (newIds.join("") !== prevIds.join("")) {
      this.setState({
        availableScrambles: this.props.availableScrambles,
      });
    }
  }

  handleGenericMove = (source, destination) => {
    const { round, attachScramblesToRound } = this.props;
    const { availableScrambles } = this.state;
    // Whatever we do, we just need to update the parent state
    let scrambles = source.droppableId === "available"
      ? availableScrambles
      : round.scrambleSets;
    let scramble = scrambles.splice(source.index, 1)[0];

    let destScrambles = destination.droppableId === source.droppableId
      ? scrambles
      : destination.droppableId === "round"
        ? round.scrambleSets
        : availableScrambles;

    // Insert the scramble to the new array at the correct spot
    destScrambles.splice(destination.index, 0, scramble);

    if (destination.droppableId === "available" && source.droppableId === "available")
      this.setState({ availableScrambles: destScrambles });
    else if (destination.droppableId === "round")
      attachScramblesToRound(destScrambles, round);
    else
      attachScramblesToRound(scrambles, round);
  }

  handleAttemptBasedMove = (source, destination) => {
    const { round, attachScramblesToRound } = this.props;
    const { availableScrambles } = this.state;
    // Again we just need to update the parent state
    let scrambles = round.scrambleSets;
    // Group round's scrambles based on attempt number
    let scramblesByAttempt = groupBy(scrambles, s => s.attemptNumber);
    let scramble = null;
    scramble = source.droppableId === "available"
      ? availableScrambles[source.index]
      : scramblesByAttempt[attemptFromDroppable(source)].splice(source.index, 1)[0];

    if (destination.droppableId !== "available") {
      let destAttempt = attemptFromDroppable(destination);
      // update the attempt number
      scramble.attemptNumber = destAttempt;
      // if that's the first scramble we move there, the entry won't exist yet
      scramblesByAttempt[destAttempt] = scramblesByAttempt[destAttempt] || [];
      // actually move the scramble to the appropriate list
      scramblesByAttempt[destAttempt].splice(destination.index, 0, scramble);
    }

    // Concatenate everything for the update
    scrambles = flatMap(Object.keys(scramblesByAttempt), k => scramblesByAttempt[k]);
    attachScramblesToRound(scrambles, round);
  }

  handleScrambleMovement = result => {
    const { source, destination } = result;

    // dropped outside the list
    if (!destination) {
      return;
    }

    if (source.droppableId.includes("-") || destination.droppableId.includes("-"))
      this.handleAttemptBasedMove(source, destination);
    else
      this.handleGenericMove(source, destination);
  };

  // TODO: save to main wcif button

  render() {
    const { event, round } = this.props;
    const { availableScrambles } = this.state;
    return (
      <DragDropContext onDragEnd={this.handleScrambleMovement}>
        <Typography variant="h3" align="center">
          {roundName(event.rounds.length, round)}
        </Typography>
        <Grid container justify="center">
          <Grid item xs={6} md={4} style={{ padding: 16 }} align="center">
            {["333mbf", "333fm"].includes(event.id) ? (
              <ListForAttemptBasedRound round={round} />
            ) : (
              <ListForGenericRound round={round} />
            )}
          </Grid>
          <Grid item xs={6} md={4} style={{ padding: 16 }} align="center">
            <Paper>
              <Typography variant="h4">
                Available
              </Typography>
              <ScrambleList scrambles={availableScrambles} holds="available" />
            </Paper>
          </Grid>
        </Grid>
      </DragDropContext>
    );
  }
};